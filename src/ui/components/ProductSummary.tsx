import { Store } from "lucide-react";
import type { ProductSnapshot } from "@core/types";
import { formatMoney } from "@ui/model/format";
import { Thumb } from "@ui/components/Thumb";

export function ProductSummary({ product }: { product: ProductSnapshot }) {
  return (
    <section className="product" aria-label="Current product">
      <Thumb src={product.imageUrl} size={52} />
      <div>
        <span className="over">You're viewing</span>
        <strong className="title">{product.title}</strong>
        <div className="row">
          {product.price && <span className="price num">{formatMoney(product.price.amount)}</span>}
          {product.seller && (
            <span className="seller">
              <Store size={12} aria-hidden="true" />
              {product.seller}
              {product.sellerScore !== undefined && <span className="num"> · {product.sellerScore}%</span>}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
